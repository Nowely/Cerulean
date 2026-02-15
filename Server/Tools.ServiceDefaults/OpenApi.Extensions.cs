using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Scalar.AspNetCore;

namespace Tools.ServiceDefaults;

public static partial class Extensions {
	public static IHostApplicationBuilder AddDefaultOpenApi(this IHostApplicationBuilder builder) {
		builder.Services.AddOpenApi();

		return builder;
	}

	public static IApplicationBuilder UseDefaultOpenApi(this WebApplication app) {
		if (!app.Environment.IsDevelopment()) return app;

		// Serve OpenAPI JSON document
		app.MapOpenApi();

		// Serve Scalar UI (modern Swagger UI alternative)
		app.MapScalarApiReference();

		return app;
	}
}
