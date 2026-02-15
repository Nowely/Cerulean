var builder = DistributedApplication.CreateBuilder(args);

var username = builder.AddParameter("keycloakAdmin");
var password = builder.AddParameter("keycloakAdminPassword", secret: true);

var keycloak = builder.AddKeycloak("keycloak", 8080, username, password)
	.WithDataVolume();

var postgres = builder.AddPostgres("Postgres").WithPgAdmin();
var affairDb = postgres.AddDatabase("AffairDb");

var affairs = builder
			  .AddProject<Projects.Affairs>(nameof(Projects.Affairs))
			  .WithReference(affairDb);

var identity = builder
	.AddProject<Projects.Identity>(nameof(Projects.Identity))
	.WithReference(keycloak);

builder
	.AddJavaScriptApp("Client", "../../Client", "dev")
	.WithEndpoint(3000, scheme: "https", env: "PORT")
	.ExcludeFromManifest();

builder.Build().Run();