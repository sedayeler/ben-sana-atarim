using BenSanaAtarim.Infrastructure;
using BenSanaAtarim.Api;
using BenSanaAtarim.Application.AI;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi;
using System.Security.Authentication;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Render gibi platformlar dinlenecek portu PORT ortam değişkeniyle verir.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Reverse proxy arkasında gerçek istemci IP'sini (hız sınırı için) X-Forwarded-For'dan okur.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// IP başına hız sınırları: fiş okuma Gemini kotasını, masa kurma/katılma veritabanını korur.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("receipt-parse", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(10), QueueLimit = 0 }));
    options.AddPolicy("bill-write", httpContext => RateLimitPartition.GetFixedWindowLimiter(
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(10), QueueLimit = 0 }));
});

builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddControllers().ConfigureApiBehaviorOptions(options =>
{
    var defaultFactory = options.InvalidModelStateResponseFactory;
    options.InvalidModelStateResponseFactory = context =>
    {
        var tooLarge = false;
        if (context.HttpContext.Request.HasFormContentType)
        {
            try
            {
                context.HttpContext.Request.ReadFormAsync().GetAwaiter().GetResult();
            }
            catch (InvalidDataException)
            {
                tooLarge = true;
            }
        }

        if (!tooLarge)
        {
            return defaultFactory(context);
        }

        return new ObjectResult(new ProblemDetails
        {
            Status = StatusCodes.Status413PayloadTooLarge,
            Title = "Payload too large",
            Detail = "Request payload exceeds the allowed limit."
        })
        { StatusCode = StatusCodes.Status413PayloadTooLarge };
    };
});
builder.Services.AddSwaggerGen(options => options.SwaggerDoc("v1", new OpenApiInfo { Title = "BenSanaAtarim API", Version = "v1" }));
builder.Services.AddSignalR();
builder.Services.Configure<FormOptions>(options => options.MultipartBodyLengthLimit = 10 * 1024 * 1024 + 64 * 1024);

var app = builder.Build();

app.UseForwardedHeaders();

app.UseExceptionHandler(exceptionApp => exceptionApp.Run(async context =>
{
    var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var (status, title, detail) = exception switch
    {
        AuthenticationException => (StatusCodes.Status401Unauthorized, "Unauthorized", exception.Message),
        UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Forbidden", exception.Message),
        InvalidDataException => (StatusCodes.Status413PayloadTooLarge, "Payload too large", "Request payload exceeds the allowed limit."),
        BadHttpRequestException badRequest => (badRequest.StatusCode, "Invalid request", badRequest.Message),
        ReceiptParsingException => (StatusCodes.Status502BadGateway, "Bad gateway", "The receipt could not be parsed."),
        KeyNotFoundException => (StatusCodes.Status404NotFound, "Not found", exception.Message),
        ArgumentException => (StatusCodes.Status400BadRequest, "Invalid request", exception.Message),
        InvalidOperationException => (StatusCodes.Status409Conflict, "Request conflict", exception.Message),
        _ => (StatusCodes.Status500InternalServerError, "Server error", "An unexpected error occurred.")
    };

    var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("BenSanaAtarim.Api.ExceptionHandler");
    if (status >= StatusCodes.Status500InternalServerError)
    {
        logger.LogError(exception, "Unhandled exception while processing {Method} {Path}", context.Request.Method, context.Request.Path);
    }
    else
    {
        logger.LogWarning("{Method} {Path} returned {Status}: {Detail}", context.Request.Method, context.Request.Path, status, detail);
    }

    context.Response.StatusCode = status;
    await context.Response.WriteAsJsonAsync(new ProblemDetails
    {
        Status = status,
        Title = title,
        Detail = detail
    });
}));

// React uygulaması (wwwroot) varsa API ile aynı adresten sunulur.
// Statik dosyalar routing'den önce çalışmalı; aksi halde fallback endpoint'i dosyaları gölgeler.
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseRateLimiter();

app.MapControllers();
app.MapHub<BillHub>("/hubs/bills");

// /masa/KOD gibi istemci rotaları index.html'e düşer; bilinmeyen /api ve /hubs yolları 404 kalır.
app.MapFallbackToFile("{*path:regex(^(?!api/|hubs/).*$)}", "index.html");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "BenSanaAtarim API v1");
        options.RoutePrefix = "swagger";
    });
}

app.Run();
