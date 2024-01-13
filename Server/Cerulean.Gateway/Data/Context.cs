using Cerulean.Models;
using Microsoft.EntityFrameworkCore;

namespace Cerulean.Data;

public class Context : DbContext {
	public Context(DbContextOptions<Context> options) : base(options) { }

	public DbSet<Affair> Affair { get; set; }
	public DbSet<Page> Page { get; set; }
	public DbSet<User> User { get; set; }

	protected override void OnModelCreating(ModelBuilder modelBuilder) {
		base.OnModelCreating(modelBuilder);

		var affairConfiguration = modelBuilder.Entity<Affair>();

		affairConfiguration
			.Property(x => x.Status)
			.HasConversion<string>()
			.HasMaxLength(30);

		affairConfiguration
			.Property(x => x.Type)
			.HasConversion<string>()
			.HasMaxLength(30);
	}
}