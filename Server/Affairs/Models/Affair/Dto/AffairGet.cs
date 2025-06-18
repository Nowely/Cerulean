using Afilter.Abstractions;

namespace Affairs.Models.Affair.Dto;

[AutoDto(typeof(Affair),
	Pick = [
		nameof(Affair.Id), nameof(Affair.CreatedAt), nameof(Affair.ModifiedAt), nameof(Affair.Title),
		nameof(Affair.Note), nameof(Affair.Active)
	]
)]
public partial class AffairGet {
	public string SuperTitle { get; set; } = string.Empty;
}