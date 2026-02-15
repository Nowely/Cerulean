using Facet;

namespace Affairs.Models.Affair.Dto;

[Facet(typeof(Affair), Include = [nameof(Id), nameof(Title),  nameof(Note)])]
public partial record AffairUpdate;
