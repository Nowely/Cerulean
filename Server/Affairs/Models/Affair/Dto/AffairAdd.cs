using Facet;

namespace Affairs.Models.Affair.Dto;

[Facet(typeof(Affair), Include = [nameof(Affair.Title), nameof(Affair.Note)])]
public partial record AffairAdd;
