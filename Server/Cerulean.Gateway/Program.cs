using Cerulean.Data;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.AddNpgsqlDbContext<Context>("Postgres");

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.MapDefaultEndpoints();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment()) {
	app.UseSwagger();
	app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

//CreateDbIfNotExists(app);

app.Run();

//TODO can change on extension
void CreateDbIfNotExists(IHost host) {
	using var scope = host.Services.CreateScope();
	var services = scope.ServiceProvider;
	try {
		var context = services.GetRequiredService<Context>();
		DbInitializer.Initialize(context);
	} catch (Exception ex) {
		var logger = services.GetRequiredService<ILogger<Program>>();
		logger.LogError(ex, "An error occurred creating the DB.");
	}
}