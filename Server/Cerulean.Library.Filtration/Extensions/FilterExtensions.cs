using System.Diagnostics;
using System.Linq.Expressions;
using System.Reflection;
using AutoFilterer;
using AutoFilterer.Attributes;
using AutoFilterer.Extensions;
using Cerulean.Library.Filtration.AutoFilterer;
using Cerulean.Library.Filtration.AutoFilterer.Types;

namespace Cerulean.Library.Filtration.Extensions;

public static class FilterExtensions {
	public static IQueryable<TEntity> ApplyMyFilter<TEntity>(IQueryable<TEntity> query, IMyFilter filter) {
		var parameter = Expression.Parameter(typeof(TEntity), "x");

		var exp = BuildExpression(typeof(TEntity), parameter, filter);
		if (exp == null)
			return query;

		if (exp is MemberExpression or ParameterExpression)
			return query;

		var lambda = Expression.Lambda<Func<TEntity, bool>>(exp, parameter);
		return query.Where(lambda);
	}

	private static Expression BuildExpression(Type entityType, Expression body, IMyFilter filter) {
		var finalExpression = body;
		var type = filter.GetType();

		foreach (var filterProperty in type.GetProperties()) {
			try {
				var filterPropertyValue = filterProperty.GetValue(filter);
				var filterPropertyExpression = Expression.Property(Expression.Constant(filter), filterProperty);

				if (filterPropertyValue == null || filterProperty.GetCustomAttribute<IgnoreFilterAttribute>() != null) {
					continue;
				}

				var attributes = filterProperty.GetCustomAttributes<CompareToAttribute>(inherit: true);

				if (!attributes.Any()) {
					attributes = new[] { new CompareToAttribute(filterProperty.Name) };
				}

				Expression innerExpression = null;

				foreach (var attribute in attributes) {
					foreach (var targetPropertyName in attribute.PropertyNames) {
						var targetProperty = entityType.GetProperty(targetPropertyName);
						if (targetProperty == null)
							continue;

						var bodyParameter = finalExpression is MemberExpression ? finalExpression : body;

						var context = new ExpressionBuildContext(
							bodyParameter,
							targetProperty,
							filterProperty,
							filterPropertyExpression,
							filter,
							filterPropertyValue
						);
						var expression = attribute.BuildExpressionForProperty(context);

						innerExpression = innerExpression.Combine(expression, attribute.CombineWith);
					}
				}

				var combined = finalExpression.Combine(innerExpression, CombineType.And);
				finalExpression = combined.Combine(body, CombineType.And);
			} catch (Exception ex) {
				Debug.WriteLine(ex?.ToString());
				throw;
			}
		}

		return finalExpression;
	}
}