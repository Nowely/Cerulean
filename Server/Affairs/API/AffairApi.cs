using Affairs.Models.Affair;
using Affairs.Models.Affair.Dto;
using Afilter.Extensions;
using Facet.Extensions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Tools.API;

namespace Affairs.API;

public static class AffairApi {
	public static IEndpointRouteBuilder MapAffairApiV1(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("api/v1/affairs");

		group.MapGet("/{id:guid}", GetById);
		group.MapPost("/filter", GetByFilter);
		group.MapPut("/", Update);
		group.MapPost("/", Create);
		group.MapDelete("/", Delete);

		return app;
	}

	public static async Task<Results<Ok<AffairGet>, NotFound, BadRequest<string>>> GetById(
		[AsParameters] GetByIdRequest request) {
		var affair = await request.Db
								  .Affair
								  .Select(AffairGet.Projection)
								  .FirstOrDefaultAsync(affair => affair.Id == request.Id);

		return Response.Get(affair);
	}

	public static async Task<Results<Ok<AffairGet[]>, BadRequest<string>>> GetByFilter(
		[AsParameters] GetAllPostRequest request) {
		var affairs = await request.Db
								   .Affair
								   .ApplyFilter(request.Filter)
								   .Select(AffairGet.Projection)
								   .ToArrayAsync();

		return Response.Get(affairs, []);
	}

	public static async Task<Results<Created<AffairGet>, BadRequest<string>>> Create(
		[AsParameters] CreateRequest request) {
		var entity = request.Dto.ToSource<Affair>();

		request.Db.Affair.Add(entity);

		await request.Db.SaveChangesAsync();
		return Response.Create(entity.ToFacet<AffairGet>());
	}

	public static async Task<Results<Created<AffairGet>, NotFound, BadRequest<string>>> Update(
		[AsParameters] UpdateRequest request) {
		var entity = await request.Db.Affair.FindAsync(request.Dto.Id);
		if (entity is null) return Response.Update<AffairGet>(null);

		request.Dto.ApplyFacet(entity);
		request.Db.Affair.Update(entity);

		await request.Db.SaveChangesAsync();
		return Response.Update(entity.ToFacet<AffairGet>());
	}

	public static async Task<Results<NoContent, NotFound, BadRequest<string>>> Delete(
		[AsParameters] DeleteRequest request) {
		var entities = request.Ids.Select(id => new Affair { Id = id });

		request.Db.Affair.RemoveRange(entities);

		await request.Db.SaveChangesAsync();
		return Response.Delete();
	}
}
