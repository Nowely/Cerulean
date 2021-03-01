using System.Linq;
using Cerulean.Models;

namespace Cerulean.Data
{
    public static class DbInitializer
    {
        public static void Initialize(Context context)
        {
            context.Database.EnsureCreated();

            if (context.Task.Any())
            {
                return; // DB has been seeded
            }

            var tasks = new Task[]
            {
                new()
                {
                    Active = true, 
                    Title = "Hello from DbInitializer", 
                    Note = "This is automatically created task",
                    Status = Status.Absent, Type = Type.Daily
                },
                new()
                {
                    Active = true, 
                    Title = "Hello from DbInitializer 2", 
                    Note = "This is automatically created another one task",
                    Status = Status.Absent, Type = Type.Daily
                }
            };

            foreach (var task in tasks)
            {
                context.Task.Add(task);
            }

            context.SaveChanges();
        }
    }
}