using System.Linq.Expressions;
using System.Reflection;
using Afftration.Abstractions;
using Afftration.Enums;
using Afftration.Extensions;
using Tools.Filtration.Abstractions;

namespace Afftration.Types;

using PropertyPair = (PropertyInfo filterProperty, PropertyInfo targetProperty);

public record FilterGroup<T> where T : IFilter {
	public CombineType Type { get; set; }
	public required T[] Where { get; set; }

	public Expression<Func<TEntity, bool>>? BuildLambdaExpression<TEntity, TFilterModel>() {
		var parameter = Expression.Parameter(typeof(TEntity), "x");
		var body = BuildBodyExpression(typeof(TEntity), parameter);

		return body is null ? null : Expression.Lambda<Func<TEntity, bool>>(body, parameter);
	}

	public Expression? BuildBodyExpression(Type targetType, Expression parameter) {
		return Where
			   .Select(filterModel => FilterExtensions.BuildBodyExpression(targetType, filterModel, parameter))
			   .OfType<Expression>()
			   .Aggregate<Expression?, Expression?>(
				   null,
				   (current, expression) => expression.Combine(current, Type)
			   );
	}
}