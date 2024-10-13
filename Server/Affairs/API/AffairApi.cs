using Affairs.Models.Affair;
using Affairs.Models.Affair.Dto;
using AutoDto.Extensions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Tools.API;

namespace Affairs.API;

public static class AffairApi {
	public static IEndpointRouteBuilder MapAffairApi(this IEndpointRouteBuilder app) {
		app.MapGet("/{id:guid}", GetById);
		app.MapPost("/filter", GetByFilter);
		app.MapPut("/", Update);
		app.MapPost("/", Create);
		app.MapDelete("/", Delete);

		return app;
	}

	public static async Task<Results<Ok<AffairGet>, NotFound, BadRequest<string>>> GetById(
		[AsParameters] GetByIdRequest request) {
		var affair = await request.Db
								  .Affair
								  .ToDto()
								  .FirstOrDefaultAsync(affair => affair.Id == request.Id);
		return Response.Get(affair);
	}

	public static async Task<Results<Ok<AffairGet[]>, BadRequest<string>>> GetByFilter(
		[AsParameters] GetAllPostRequest request) {
		var affairs = await request.Db
								   .Affair
								   .ApplyFilter(request.Filter)
								   .ToDto()
								   .ToArrayAsync();

		return Response.Get(affairs, []);
	}

	public static async Task<Results<Created<AffairGet>, BadRequest<string>>> Create(
		[AsParameters] CreateRequest request) {
		var entity = request.Dto.ToEntity();

		request.Db.Affair.Add(entity);

		await request.Db.SaveChangesAsync();
		return Response.Create(entity.ToDto());
	}

	public static async Task<Results<Created<AffairGet>, NotFound, BadRequest<string>>> Update(
		[AsParameters] UpdateRequest request) {
		var entity = await request.Db.Affair.FindAsync(request.Dto.Id);
		if (entity is null) return Response.Update<AffairGet>(null);

		request.Dto.ApplyUpdateTo(entity);
		request.Db.Affair.Update(entity);

		await request.Db.SaveChangesAsync();
		return Response.Update(entity.ToDto());
	}

	public static async Task<Results<NoContent, NotFound, BadRequest<string>>> Delete(
		[AsParameters] DeleteRequest request) {
		var entities = request.Ids.Select(id => new Affair { Id = id });

		request.Db.Affair.RemoveRange(entities);

		await request.Db.SaveChangesAsync();
		return Response.Delete();
	}
}