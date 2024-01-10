var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("CeruleanDB").AddDatabase("Postgres");

var gateway =  builder.AddProject<Projects.Cerulean_Gateway>("Gateway")
					  .WithReference(postgres);

builder.AddNpmApp("Client", "../Client", "dev")
	   .WithReference(gateway)
	   //.WithReference(cache)
	   .WithServiceBinding(containerPort: 3000, scheme: "https", env: "PORT")
	   /*.AsDockerfileInManifest()*/;

builder.Build().Run();
