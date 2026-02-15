using Facet;

namespace Affairs.Models.Affair;

[Facet(typeof(Affair), Include = [nameof(Affair.Title), nameof(Affair.Note)])]
public partial record AffairCreate;

[Facet(typeof(Affair), Include = [
	nameof(Affair.Id), nameof(Affair.CreatedAt), nameof(Affair.ModifiedAt), nameof(Affair.Title),
	nameof(Affair.Note), nameof(Affair.Active)
])]
public partial record AffairGet;

[Facet(typeof(Affair), Include = [nameof(Id), nameof(Title), nameof(Note)])]
public partial record AffairUpdate;