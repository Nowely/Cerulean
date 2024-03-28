
using Tools.Filtration.Enums;

namespace Tools.Filtration.Abstractions;

public interface IOrderable
{
  SortDirection SortBy { get; set; }

   string Sort { get; }

    IOrderedQueryable<TSource> ApplyOrder<TSource>(IQueryable<TSource> source);
}
