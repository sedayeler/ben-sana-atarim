using BenSanaAtarim.Application.Repositories;
using BenSanaAtarim.Infrastructure.Persistence;
using BenSanaAtarim.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BenSanaAtarim.Infrastructure;

public static class ServiceRegistration
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<BenSanaAtarimDbContext>(options => options.UseNpgsql(configuration.GetConnectionString("PostgreSQL")));

        services.AddScoped(typeof(IReadRepository<>), typeof(ReadRepository<>));
        services.AddScoped(typeof(IWriteRepository<>), typeof(WriteRepository<>));

        services.AddScoped<IBillReadRepository, BillReadRepository>();
        services.AddScoped<IBillWriteRepository, BillWriteRepository>();
        services.AddScoped<IParticipantReadRepository, ParticipantReadRepository>();
        services.AddScoped<IParticipantWriteRepository, ParticipantWriteRepository>();
        services.AddScoped<IBillItemReadRepository, BillItemReadRepository>();
        services.AddScoped<IBillItemWriteRepository, BillItemWriteRepository>();
        services.AddScoped<IItemSelectionReadRepository, ItemSelectionReadRepository>();
        services.AddScoped<IItemSelectionWriteRepository, ItemSelectionWriteRepository>();

        return services;
    }
}
