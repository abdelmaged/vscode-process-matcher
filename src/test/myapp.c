#include <stdio.h>

#ifdef _WIN64
#include <windows.h>
#else
#include <unistd.h>
#endif

void sleepInSeconds(int seconds) {
#ifdef _WIN64
  Sleep(seconds * 1000);
#else
  sleep(seconds);
#endif
}

int main() {
  size_t i;
  const size_t kWait = 2 * 60;

  puts("start ...");
  for (i = 0; i < kWait; ++i) {
    printf("waiting ... %zu/%zu\r", i + 1, kWait);
    sleepInSeconds(1);
  }
  puts("\nend ...");
  return 0;
}