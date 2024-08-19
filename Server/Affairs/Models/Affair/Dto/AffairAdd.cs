using Tools.Shared;

namespace Affairs.Models.Affair.Dto;

[AutoDto(
	Props = [nameof(Affair.Title), nameof(Affair.Note)],
	Type = typeof(Affair)
	)]
public partial class AffairAdd;