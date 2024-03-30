using Affairs.Models.Affair;
using Affairs.Models.Domain;
using Microsoft.EntityFrameworkCore;

namespace Affairs.Infrastructure;

public sealed class AffairContext : DbContext {
	public AffairContext(DbContextOptions<AffairContext> options) : base(options) {
		Database.EnsureDeleted();
		Database.EnsureCreated();
		//DbInitializer.Initialize(this);
	}

	public DbSet<Affair> Affair => Set<Affair>();
	public DbSet<Page> Page => Set<Page>();
	public DbSet<User> User => Set<User>();

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