using Cerulean.Service.Affairs.Data;

namespace Cerulean.Service.Affairs.Extensions;

public static class Extensions
{
	public static void AddApplicationServices(this IHostApplicationBuilder builder)
	{
		builder.AddNpgsqlDbContext<AffairContext>("Postgres");
	}
}