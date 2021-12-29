using Cerulean.Models;
using Microsoft.EntityFrameworkCore;

namespace Cerulean.Data;

public class Context : DbContext
{
    public Context(DbContextOptions<Context> options) : base(options) { }

    public DbSet<Affair> Affair { get; set; }
}