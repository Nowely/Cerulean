using Cerulean.Models;
using Microsoft.EntityFrameworkCore;

namespace Cerulean.Data;

public class Context : DbContext {
	public Context(DbContextOptions<Context> options) : base(options) { }

	public DbSet<Affair> Affair { get; set; }
	public DbSet<Page> Page { get; set; }
	public DbSet<User> User { get; set; }

	/*protected override void OnModelCreating(ModelBuilder modelBuilder) {
		base.OnModelCreating(modelBuilder);
		modelBuilder.Entity<Affair>()
			.Property(x => x.Tags)
			.HasConversion(new ValueConverter<List<string>, string>(
				v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
				v => JsonSerializer.Deserialize<List<string>>(v, JsonSerializerOptions.Default)
				));
	}*/
}