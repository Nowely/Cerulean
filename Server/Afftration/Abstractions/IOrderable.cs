
using Afftration.Enums;

namespace Afftration.Abstractions;

internal interface IOrderable
{
  SortDirection SortBy { get; set; }

   string Sort { get; }

    IOrderedQueryable<TSource> ApplyOrder<TSource>(IQueryable<TSource> source);
}
