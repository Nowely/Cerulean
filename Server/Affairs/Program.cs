using Affairs.API;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddDefaultOpenApi();
builder.AddApplicationServices();

builder.Services.AddControllers();

var app = builder.Build();

app.UseDefaultOpenApi();

app.MapDefaultEndpoints();

app.UseHttpsRedirection();

app.MapGroup("api/v1/affairs").MapAffairApi();

app.Run();