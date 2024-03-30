using Affairs.Infrastructure;

namespace Affairs.Extensions;

public static class Extensions
{
	public static void AddApplicationServices(this IHostApplicationBuilder builder)
	{
		builder.AddNpgsqlDbContext<AffairContext>("AffairDb");
	}
}