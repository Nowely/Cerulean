using System.Linq.Expressions;
using System.Reflection;
using Tools.Filtration.Abstractions;
using Tools.Filtration.Enums;
using Tools.Filtration.Extensions;

namespace Tools.Filtration.Types;

using PropertyPair = (PropertyInfo filterProperty, PropertyInfo targetProperty);

public record FilterGroup<T> where T : IFilter {
	public CombineType Type { get; set; }
	public required T[] Where { get; set; }

	public Expression<Func<TEntity, bool>>? BuildLambdaExpression<TEntity, TFilterModel>() {
		var parameter = Expression.Parameter(typeof(TEntity), "x");
		var body = BuildBodyExpression(typeof(TEntity), parameter);

		return body is null ? null : Expression.Lambda<Func<TEntity, bool>>(body, parameter);
	}

	private Expression? BuildBodyExpression(Type targetType, Expression parameter) {
		Expression? bodyExpression = null;

		foreach (var (filterProperty, targetProperty) in GetPropertyPairs(targetType, this)) {
			if (filterProperty.GetValue(this) is not IFilterOperator filterOperator) continue;

			var target = Expression.Property(parameter, targetProperty.Name);

			var expression = filterOperator.BuildExpressionFor(target);
			if (expression is not null)
				bodyExpression = expression.Combine(bodyExpression, Type);
		}

		return bodyExpression;
	}

	private static IEnumerable<PropertyPair> GetPropertyPairs<TFilterModel>(
		Type targetType, FilterGroup<TFilterModel> filter
	) where TFilterModel : IFilter =>
		filter
			.GetType()
			.GetProperties()
			.Select(filterProperty =>
				(filterProperty, targetProperty: targetType.GetProperty(filterProperty.Name)))
			.Where(tuple => tuple.targetProperty is not null)!;
}