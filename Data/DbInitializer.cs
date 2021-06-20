using System.Linq;
using Cerulean.Models;

namespace Cerulean.Data
{
	public static class DbInitializer
	{
		public static void Initialize(Context context)
		{
			context.Database.EnsureCreated();

			if (context.Affair.Any())
			{
				return; // DB has been seeded
			}

			var affairs = new Affair[]
			{
				new()
				{
					Title = "Выжить",
					Note = "",
					Active = false,
					Status = Status.Failed,
					Type = Type.Year,
				},
				new()
				{
					Title = "Перейти рубикон",
					Note = "Пройти «точку невозврата»",
					Active = true,
					Status = Status.Absent,
					Type = Type.Year,
				},
				new()
				{
					Title = "Buy a new board game",
					Note = "Eldritch Horror",
					Active = true,
					Status = Status.Absent,
					Type = Type.Week,
				},
				new()
				{
					Title = "Прочитать одну книгу",
					Note = "",
					Active = true,
					Status = Status.Absent,
					Type = Type.Week,
				},
				new()
				{
					Title = "Прослушать одну книгу",
					Note = "",
					Active = true,
					Status = Status.Absent,
					Type = Type.Week,
				},
				new()
				{
					Title = "Улучшить дизайн",
					Note = "",
					Active = true,
					Status = Status.Absent,
					Type = Type.Month,
				},
				new()
				{
					Title = "Улушчить код",
					Note = "",
					Active = true,
					Status = Status.Absent,
					Type = Type.Month,
				},
				new()
				{
					Title = "Улучшить структуру",
					Note = "",
					Active = true,
					Status = Status.Absent,
					Type = Type.Month,
				},
				new()
				{
					Title = "Подумать над добавлением новой функциональности",
					Note = "",
					Active = true,
					Status = Status.Absent,
					Type = Type.Month,
				},
				new()
				{
					Title = "Обновить Readme",
					Note = "",
					Active = true,
					Status = Status.Absent,
					Type = Type.Daily,
				}
			};

				foreach (var affair in affairs)
				{
				context.Affair.Add(affair);
				}

				context.SaveChanges();
			}
		}
	}