using System.Collections;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json.Serialization;
using AutoDto.Abstractions;
using AutoDto.Internals;
using static System.Linq.Expressions.Expression;

namespace AutoDto.Operators;

[JsonConverter(typeof(JsonStringOrNumberEnumConverter<ArrayOperatorType>))]
public enum ArrayOperatorType {
	Equal,
	NotEqual,
	Intersect,
	NotIntersect,
	Include,
	NotInclude,
	IsEmpty,
	IsNotEmpty
}

public record ArrayOperator<T>(ArrayOperatorType Type, T? Value = default) : IFilterOperator
	where T : IEnumerable {
	private Expression Filter => Property(Expression.Constant(this), nameof(Value));

	public Expression? BuildExpressionFor(MemberExpression target) => Type switch {
		ArrayOperatorType.Equal => Equal(target, Filter),
		ArrayOperatorType.NotEqual => Not(Equal(target, Filter)),

		ArrayOperatorType.IsEmpty => Not(IsNotEmpty(target)),
		ArrayOperatorType.IsNotEmpty => IsNotEmpty(target),

		ArrayOperatorType.Intersect => Intersect(target, Filter),
		ArrayOperatorType.NotIntersect => Not(Intersect(target, Filter)),

		ArrayOperatorType.Include => Include(target, Filter),
		ArrayOperatorType.NotInclude => Not(Include(target, Filter)),

			_ => null
		};

	private static MethodCallExpression Equal(Expression target, Expression filter) =>
		Call(GetMethod(nameof(Enumerable.SequenceEqual)), target, filter);

	// target != null && target.Any > 0
	private static BinaryExpression IsNotEmpty(Expression target) =>
		AndAlso(
			Expression.MakeBinary(ExpressionType.NotEqual, target, Constant(null)),
			Expression.Call(GetMethod(nameof(Enumerable.Any)), target)
		);

	// array1.Intersect(array2).Any()
	private static MethodCallExpression Intersect(Expression target, Expression filter) {
		var intersect = GetMethod(nameof(Enumerable.Intersect));
		var any = GetMethod(nameof(Enumerable.Any));

		var intersected = Call(intersect, target, filter);
		return Call(any, intersected);
	}

	// array1.All(i => array2.Contains(i)) or filter.All(i => target.Contains(i))
	private static MethodCallExpression Include(Expression target, Expression filter) {
		var parameter = Parameter(typeof(T).GetElementType()!, "i");
		var body = Call(GetMethod(nameof(Enumerable.Contains)), target, parameter);
		var lambda = Expression.Lambda(body, parameter);
		return Call(GetMethod(nameof(Enumerable.All)), filter, lambda);
	}

	private static MethodInfo GetMethod(string name) =>
		typeof(Enumerable)
			.GetMethods()
			.First(info => info.Name == name)
			.MakeGenericMethod(typeof(T).GetElementType()!);
}