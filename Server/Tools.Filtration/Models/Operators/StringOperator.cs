using System.Linq.Expressions;
using System.Text.RegularExpressions;
using AutoFilterer.Abstractions;
using Tools.Filtration.AutoFilterer;
using Tools.Filtration.Enums;
using static System.Linq.Expressions.Expression;

namespace Tools.Filtration.Models.Operators;

public record StringFilterOption(StringComparison? Comparison);

public record StringOperator(StringOperatorType Type, string? Value = null) : IFilterableType {
	public Expression? BuildExpression(ExpressionBuildContext context) {
		//TODO to context
		var target = Property(context.ParameterExpression, context.TargetProperty.Name);
		var innerProperty = context.FilterProperty.PropertyType.GetProperty(nameof(Value));
		var filter = Property(context.FilterPropertyExpression, innerProperty);

		return Type switch {
			StringOperatorType.Is => Is(target, filter),
			StringOperatorType.IsNot => Not(Is(target, filter)),

			StringOperatorType.IsEmpty => IsEmpty(target),
			StringOperatorType.IsNotEmpty => Not(IsEmpty(target)),

			StringOperatorType.Contains => Contains(target, filter),
			StringOperatorType.NotContains => Not(Contains(target, filter)),

			StringOperatorType.StartsWith => StartsWith(target, filter),
			StringOperatorType.NotStartsWith => Not(StartsWith(target, filter)),

			StringOperatorType.EndsWith => EndsWith(target, filter),
			StringOperatorType.NotEndsWith => Not(EndsWith(target, filter)),

			StringOperatorType.IsMatch => IsMatch(target, filter),
			StringOperatorType.IsNotMatch => Not(IsMatch(target, filter)),

			_ => null
		};
	}

	private static BinaryExpression Is(Expression target, Expression filter) =>
		MakeBinary(ExpressionType.Equal, target, filter);

	private static MethodCallExpression IsEmpty(Expression target) =>
		Call(typeof(string), nameof(string.IsNullOrWhiteSpace), [], target);

	private static MethodCallExpression Contains(Expression target, Expression filter) =>
		Call(target, nameof(string.Contains), [], filter);

	private static MethodCallExpression StartsWith(Expression target, Expression filter) =>
		Call(target, nameof(string.StartsWith), [], filter);

	private static MethodCallExpression EndsWith(Expression target, Expression filter) =>
		Call(target, nameof(string.EndsWith), [], filter);

	private static MethodCallExpression IsMatch(Expression target, Expression filter) =>
		Call(typeof(Regex), nameof(Regex.IsMatch), [], target, filter);
}