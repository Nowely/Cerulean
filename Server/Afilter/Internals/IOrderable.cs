using Afilter.Enums;

namespace Afilter.Abstractions;

internal interface IOrderable
{
  SortDirection SortBy { get; set; }

   string Sort { get; }

    IOrderedQueryable<TSource> ApplyOrder<TSource>(IQueryable<TSource> source);
}
