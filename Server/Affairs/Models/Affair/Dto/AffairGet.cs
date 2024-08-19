using Tools.Shared;

namespace Affairs.Models.Affair.Dto;

[AutoDto(
	Props = [nameof(Affair.Id), nameof(Affair.CreatedAt), nameof(Affair.ModifiedAt), nameof(Affair.Title),
	nameof(Affair.Note), nameof(Affair.Active)],
	Type = typeof(Affair)
)]
public partial class AffairGet {
	public string SuperTitle { get; set; } = string.Empty;
	public Guid Id { get; set; }
}