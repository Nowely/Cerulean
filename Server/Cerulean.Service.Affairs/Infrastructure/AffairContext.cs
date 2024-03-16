using Cerulean.Service.Affairs.Models.Affair;
using Cerulean.Service.Affairs.Models.Domain;
using Microsoft.EntityFrameworkCore;

namespace Cerulean.Service.Affairs.Data;

public sealed class AffairContext : DbContext {
	public AffairContext(DbContextOptions<AffairContext> options) : base(options) {
		Database.EnsureDeleted();
		Database.EnsureCreated();
		//DbInitializer.Initialize(this);
	}

	public DbSet<Affair> Affair { get; set; }
	public DbSet<Page> Page { get; set; }
	public DbSet<User> User { get; set; }

	protected override void OnModelCreating(ModelBuilder modelBuilder) {
		base.OnModelCreating(modelBuilder);

		modelBuilder.Entity<Affair>(builder => {
			builder
				.Property(x => x.Status)
				.HasConversion<string>()
				.HasMaxLength(30);

			builder
				.Property(x => x.Type)
				.HasConversion<string>()
				.HasMaxLength(30);
		});
	}
}