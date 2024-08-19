using AutoDto.Abstractions;

namespace Affairs.Models.Affair.Dto;

[AutoDto(typeof(Affair),
	Pick = [nameof(Affair.Title), nameof(Affair.Note)]
	)]
public partial class AffairAdd;