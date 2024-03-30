using Affairs.Infrastructure;
using Affairs.Models.Affair;
using Affairs.Models.Affair.Dto;
using Affairs.Models.Requests;

namespace Affairs.API;

public record GetByIdRequest : IdRequest<AffairContext>;

public record GetAllPostRequest : FilterableRequest<AffairContext, AffairFilter>;

public record CreateRequest : DtoRequest<AffairContext, AffairAdd>;

public record UpdateRequest : DtoRequest<AffairContext, AffairUpdate>;

public record DeleteRequest : IdsRequest<AffairContext, Guid>;