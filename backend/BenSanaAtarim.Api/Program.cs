using BenSanaAtarim.Infrastructure;
using BenSanaAtarim.Api;
using BenSanaAtarim.Application.AI;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi;
using System.Security.Authentication;

var builder = WebApplication.CreateBuilder(args);

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

app.MapControllers();
app.MapHub<BillHub>("/hubs/bills");

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
