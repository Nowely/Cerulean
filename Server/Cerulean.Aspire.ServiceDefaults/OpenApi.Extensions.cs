using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Cerulean.Aspire.ServiceDefaults;

public static partial class Extensions {
	public static IApplicationBuilder UseDefaultOpenApi(this WebApplication app) {
		if (app.Environment.IsDevelopment()) {
			app.UseSwagger();
			app.UseSwaggerUI();
		}

		return app;
	}

	public static IHostApplicationBuilder AddDefaultOpenApi(this IHostApplicationBuilder builder) {
		// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
		builder.Services.AddEndpointsApiExplorer();
		builder.Services.AddSwaggerGen();

		return builder;
	}
}