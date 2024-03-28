
using Tools.Filtration.Enums;

namespace AutoFilterer.Abstractions;

public interface IOrderable
{
  SortDirection SortBy { get; set; }

   string Sort { get; }

    IOrderedQueryable<TSource> ApplyOrder<TSource>(IQueryable<TSource> source);
}
