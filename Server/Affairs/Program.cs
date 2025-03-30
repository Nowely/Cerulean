using Affairs.API;
using Affairs.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ProblemDetailsFiller>();

builder.AddServiceDefaults();
builder.AddDefaultOpenApi();
builder.AddApplicationServices();

builder.Services.AddControllers();

var app = builder.Build();

app.UseExceptionHandler();

app.UseDefaultOpenApi();

app.MapDefaultEndpoints();

app.UseHttpsRedirection();

app.MapAffairApiV1();
app.MapNextApiV1();

app.MapGet("/search", ([AsParameters] SearchRequest request) => "Hello");

app.Run();