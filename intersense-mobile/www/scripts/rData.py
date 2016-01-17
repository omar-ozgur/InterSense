import random

y = [34.065, 34.078]
x = [-118.455, -118.435]

for i in range(0,50):
  print(str(random.uniform(y[0], y[1]))+" "+str(random.uniform(x[0], x[1]))+" "+str(random.uniform(0.0, 10.0))+" \\")
