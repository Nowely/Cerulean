
namespace AutoFilterer.Abstractions;

public interface IOrderable
{
  Sorting SortBy { get; set; }

   string Sort { get; }

    IOrderedQueryable<TSource> ApplyOrder<TSource>(IQueryable<TSource> source);
}
