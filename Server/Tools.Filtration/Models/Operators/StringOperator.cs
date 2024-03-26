using System.Linq.Expressions;
using System.Text.RegularExpressions;
using AutoFilterer.Abstractions;
using Tools.Filtration.AutoFilterer;
using Tools.Filtration.Enums;
using static System.Linq.Expressions.Expression;

namespace Tools.Filtration.Models.Operators;

public record StringOperator(StringOperatorType Type, string? Value = null) : IFilterableType {
	public Expression? BuildExpression(ExpressionBuildContext context) {
		var targetProperty = Property(context.ParameterExpression, context.TargetProperty.Name);
		var innerProperty = context.FilterProperty.PropertyType.GetProperty(nameof(Value));
		var filterProperty = Property(context.FilterPropertyExpression, innerProperty);

		return Type switch {
			StringOperatorType.Is => MakeBinary(ExpressionType.Equal, targetProperty, filterProperty),
			StringOperatorType.IsNot => MakeBinary(ExpressionType.NotEqual, targetProperty, filterProperty),
			StringOperatorType.IsEmpty => Call(typeof(string), nameof(string.IsNullOrWhiteSpace), [], targetProperty),
			StringOperatorType.IsNotEmpty => Not(Call(typeof(string), nameof(string.IsNullOrWhiteSpace), [], targetProperty)),
			StringOperatorType.Contains => Call(targetProperty, nameof(string.Contains), [], filterProperty),
			StringOperatorType.NotContains => Not(Call(targetProperty, nameof(string.Contains), [], filterProperty)),
			StringOperatorType.StartsWith => Call(targetProperty, nameof(string.StartsWith), [], filterProperty),
			StringOperatorType.NotStartsWith => Not(Call(targetProperty, nameof(string.StartsWith), [], filterProperty)),
			StringOperatorType.EndsWith => Call(targetProperty, nameof(string.EndsWith), [], filterProperty),
			StringOperatorType.NotEndsWith => Not(Call(targetProperty, nameof(string.EndsWith), [], filterProperty)),
			StringOperatorType.IsMatch => Call(typeof(Regex), nameof(Regex.IsMatch), [], targetProperty, filterProperty),
			StringOperatorType.IsNotMatch => Not(Call(typeof(Regex), nameof(Regex.IsMatch), [], targetProperty, filterProperty)),
			_ => null
		};
	}

	/*if (Type == StringOperatorType.Is)
			expression =
				new StringFilterOptionsAttribute(StringFilterOption.Equals) { Comparison = Compare }.BuildExpression(
					ContextFor(context, nameof(Equals), Equals));

		if (Type == StringOperatorType.Contains)
			expression =
				new StringFilterOptionsAttribute(StringFilterOption.Contains) { Comparison = Compare }.BuildExpression(
					ContextFor(context, nameof(Contains), Contains));

		if (Type == StringOperatorType.NotContains)
			expression = Expression.Not(new StringFilterOptionsAttribute(StringFilterOption.Contains) { Comparison = Compare }.BuildExpression(ContextFor(context, nameof(NotContains), NotContains)));

		if (Type == StringOperatorType.StartsWith)
			expression = new StringFilterOptionsAttribute(StringFilterOption.StartsWith) { Comparison = Compare }.BuildExpression(ContextFor(context, nameof(StartsWith), StartsWith));

		if (Type == StringOperatorType.EndsWith)
			expression = new StringFilterOptionsAttribute(StringFilterOption.EndsWith) { Comparison = Compare }.BuildExpression(ContextFor(context, nameof(EndsWith), EndsWith));*/
	//if (NotStartsWith != null)
	//  expression = expression.Combine(Expression.Not(new StringFilterOptionsAttribute(StringFilterOption.StartsWith) { Comparison = Compare }.BuildExpression(ContextFor(context, nameof(NotStartsWith), NotStartsWith))), CombineWith);
	//if (NotEndsWith != null)
	//  expression = expression.Combine(Expression.Not(new StringFilterOptionsAttribute(StringFilterOption.EndsWith) { Comparison = Compare }.BuildExpression(ContextFor(context, nameof(NotEndsWith), NotEndsWith))), CombineWith);
}