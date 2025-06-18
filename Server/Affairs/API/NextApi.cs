using System.ComponentModel.DataAnnotations;
using Affairs.Infrastructure;
using Affairs.Models.Affair;
using Affairs.Models.Affair.Dto;
using Afilter.Extensions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;
using Tools.API;
using ValidationException = Affairs.Infrastructure.ValidationException;

namespace Affairs.API;

public static class NextApi {
	public static IEndpointRouteBuilder MapNextApiV1(this IEndpointRouteBuilder app) {
		var group = app.MapGroup("api/v1/next")
			.WithMetadata(
				new ProducesResponseTypeMetadata(500, typeof(ProblemDetails))
			);

		group.MapGet("/501", Get501);
		group.MapGet("/500", Get500);
		group.MapGet("/400/validation", GetValidation400);
		group.MapGet("/404", Get404);

		group.MapGet("/{id:guid}", GetById);
		group.MapGet("/", GetList);
		group.MapPut("/", Update).ProducesProblem(405);
		group.MapPost("/", Create);
		group.MapDelete("/", Delete);

		return app;
	}


	public static async Task<Ok> Get501() => throw new NotImplementedException("Method not implemented!");
	public static async Task<Ok> Get500() => throw new Exception("Internal Server Error!");

	[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
	public static async Task<Ok> GetValidation400() =>
		throw new ValidationException("Validation failed!", new() { ["Field"] = ["Error1", "Error2"] });

	public static async Task<Ok> Get404() => throw new NotFoundException("Not found!");


	[ProducesResponseType(StatusCodes.Status400BadRequest)]
	public static async Task<Ok<AffairGet>> GetById([AsParameters] GetByIdRequest request) =>
		throw new NotImplementedException();

	public static async Task<Ok> GetList([AsParameters] GetAllPostRequest request) {
		throw new NotImplementedException();
	}

	public static async Task<Created<AffairGet>> Create([AsParameters] CreateRequest request) {
		throw new NotImplementedException();
	}

	public static async Task<Created<AffairGet>> Update([AsParameters] UpdateRequest request) {
		throw new NotImplementedException();
	}

	public static async Task<NoContent> Delete([AsParameters] DeleteRequest request) {
		throw new NotImplementedException();
	}
}