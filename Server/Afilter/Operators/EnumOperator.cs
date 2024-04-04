using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json.Serialization;
using Afilter.Abstractions;
using Afilter.Internals;
using static System.Linq.Expressions.Expression;

namespace Afilter.Operators;

//Right is array of enum state / tags
[JsonConverter(typeof(JsonStringOrNumberEnumConverter<EnumOperatorType>))]
public enum EnumOperatorType {
	Is,
	IsNot,
	IsEmpty,
	IsNotEmpty
}

//Это любые типы перечислений, когда предоставляется на выбор несколько состояний.
public record EnumOperator<T>(EnumOperatorType Type, T[]? Value = null) : IFilterOperator {
	private Expression Filter => Property(Expression.Constant(this), nameof(Value));

	public Expression? BuildExpressionFor(MemberExpression target) => Type switch {
		EnumOperatorType.Is => Is(target, Filter),
		EnumOperatorType.IsNot => Not(Is(target, Filter)),

		EnumOperatorType.IsEmpty => IsEmpty(target),
		EnumOperatorType.IsNotEmpty => Not(IsEmpty(target)),

		_ => null
	};

	private Expression Is(Expression target, Expression filter) {
		if (typeof(T).GetCustomAttribute<FlagsAttribute>() is not null && Value is not null) {
			var flags = Value
					  .Select(value => Convert(Constant(value), typeof(byte)))
					  .Aggregate<Expression>(Or);

			var flag = And(Convert(target, typeof(byte)), flags);
			return NotEqual(flag, Convert(Constant(0), typeof(byte)));
		}

		return Call(
			typeof(Enumerable)
				.GetMethods()
				.First(x => x.Name == nameof(Enumerable.Contains))
				.MakeGenericMethod(typeof(T))
			, filter, target);
	}

	private static BinaryExpression IsEmpty(Expression target) => Equal(target, Constant(default(T)));
}