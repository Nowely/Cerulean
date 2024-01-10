var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("CeruleanDB").AddDatabase("Postgres");

builder.AddProject<Projects.Cerulean_Gateway>("cerulean")
	   .WithReference(postgres);

builder.Build().Run();
