var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres").AddDatabase("postgresdb");

builder.AddProject<Projects.Cerulean_Gateway>("cerulean")
	   .WithReference(postgres);

builder.Build().Run();
