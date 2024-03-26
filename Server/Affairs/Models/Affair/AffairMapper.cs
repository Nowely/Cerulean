using Affairs.Models.Affair.Dto;
using Riok.Mapperly.Abstractions;

namespace Affairs.Models.Affair;

[Mapper]
public static partial class AffairMapper {
	public static partial IQueryable<AffairGet> ToDto(this IQueryable<Affair> source);
	public static partial AffairGet ToDto(this Affair source);
	public static partial Affair ToEntity(this AffairAdd source);
	public static partial void ApplyUpdateTo(this AffairUpdate source, Affair entity);
}