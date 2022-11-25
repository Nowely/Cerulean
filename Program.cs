global using System;
using Cerulean.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<Context>(options =>
	//options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")) TODO add sup more provider UseLocalDB
	options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));
builder.Services.AddDatabaseDeveloperPageExceptionFilter();
builder.Services.AddControllersWithViews();
builder.Services.AddSpaStaticFiles(configuration => { configuration.RootPath = "ClientApp/dist"; });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
	app.UseDeveloperExceptionPage();
else {
	app.UseExceptionHandler("/Error");
	// The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
	app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseSpaStaticFiles();
app.UseRouting();

app.UseEndpoints(endpoints => {
	endpoints.MapControllerRoute(
		"default",
		"{controller}/{action=Index}/{id?}");
});

if (app.Environment.IsDevelopment())
	app.UseSpa(spa => {
		spa.UseProxyToSpaDevelopmentServer("http://127.0.0.1:5173");
		//if (app.Environment.IsDevelopment()) spa.UseReactDevelopmentServer("start");
	});
else {
	app.MapFallbackToFile("index.html");
}

CreateDbIfNotExists(app);

app.Run();

//TODO can change on extension
void CreateDbIfNotExists(IHost host) {
	using var scope = host.Services.CreateScope();
	var services = scope.ServiceProvider;
	try {
		var context = services.GetRequiredService<Context>();
		DbInitializer.Initialize(context);
	}
	catch (Exception ex) {
		var logger = services.GetRequiredService<ILogger<Program>>();
		logger.LogError(ex, "An error occurred creating the DB.");
	}
}