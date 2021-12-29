global using System;
using Cerulean.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<Context>(options =>
	//options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")) TODO add sup more provider UseLocalDB
	options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));
builder.Services.AddDatabaseDeveloperPageExceptionFilter();
builder.Services.AddControllersWithViews();
builder.Services.AddSpaStaticFiles(configuration => { configuration.RootPath = "ClientApp/build"; });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
	app.UseDeveloperExceptionPage();
}
else
{
	app.UseExceptionHandler("/Error");
	// The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
	app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseSpaStaticFiles();
app.UseRouting();

app.UseEndpoints(endpoints =>
{
	endpoints.MapControllerRoute(
		name: "default",
		pattern: "{controller}/{action=Index}/{id?}");
});

app.UseSpa(spa =>
{
	spa.Options.SourcePath = "ClientApp";

	if (app.Environment.IsDevelopment())
	{
		spa.UseReactDevelopmentServer(npmScript: "start");
	}
});

CreateDbIfNotExists(app);

app.Run();

//TODO can change on extension
void CreateDbIfNotExists(IHost host)
{
	using var scope = host.Services.CreateScope();
	var services = scope.ServiceProvider;
	try
	{
		var context = services.GetRequiredService<Context>();
		DbInitializer.Initialize(context);
	}
	catch (Exception ex)
	{
		var logger = services.GetRequiredService<ILogger<Program>>();
		logger.LogError(ex, "An error occurred creating the DB.");
	}
}