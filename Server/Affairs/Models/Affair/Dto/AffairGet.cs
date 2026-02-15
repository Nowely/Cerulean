using Facet;

namespace Affairs.Models.Affair.Dto;

[Facet(typeof(Affair), Include = [
	nameof(Affair.Id), nameof(Affair.CreatedAt), nameof(Affair.ModifiedAt), nameof(Affair.Title),
	nameof(Affair.Note), nameof(Affair.Active)
])]
public partial record AffairGet {
    public string SuperTitle { get; set; } = string.Empty;
}
