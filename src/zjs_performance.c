// Copyright (c) 2016, Linaro Limited.
#ifdef BUILD_MODULE_PERFORMANCE

// ZJS includes
#include "zjs_util.h"
#include "zjs_callbacks.h"

#ifdef ZJS_LINUX_BUILD
#include <sys/time.h>
#endif

int counter = 0;
uint32_t last_now = 0;

static jerry_value_t zjs_performance_now(const jerry_value_t function_obj,
                                         const jerry_value_t this,
                                         const jerry_value_t argv[],
                                         const jerry_length_t argc)
{
    if (argc != 0)
        return zjs_error("performance.now: no args expected");
#ifdef ZJS_LINUX_BUILD
    struct timeval tv;
    gettimeofday(&tv, NULL);
    uint64_t useconds = (uint64_t)tv.tv_sec * 1000000 + tv.tv_usec;
#else
    uint64_t useconds = (uint64_t)k_uptime_get() * 1000;
    ZJS_PRINT("Last CB time: %lu, now: %lu\n", zjs_last_cb_time(),
              k_cycle_get_32());
    last_now = k_cycle_get_32();

#endif
    return jerry_create_number((double)useconds / 1000);
}

static jerry_value_t zjs_performance_noop(const jerry_value_t function_obj,
                                          const jerry_value_t this,
                                          const jerry_value_t argv[],
                                          const jerry_length_t argc)
{
    ++counter;
    if (counter % 100 == 0) {
        uint32_t time_now = k_cycle_get_32();
        ZJS_PRINT("Time for 100 calls: %lu (%d)\n", time_now - last_now,
                  counter);
    }
    return ZJS_UNDEFINED;
}

static jerry_value_t zjs_performance_once(const jerry_value_t function_obj,
                                          const jerry_value_t this,
                                          const jerry_value_t argv[],
                                          const jerry_length_t argc)
{
    uint32_t start = k_cycle_get_32();
    ZJS_PRINT("1234567890123456789012345678901234567890123456789012345678901234567890123456789\n");
    uint32_t stop = k_cycle_get_32();
    ZJS_PRINT("Time to print 79 chars + newline: %lu\n", stop - start);

    start = k_cycle_get_32();
    ZJS_PRINT("12345678901234567890123456789012345678901234567890123456789\n");
    stop = k_cycle_get_32();
    ZJS_PRINT("Time to print 60 chars + newline: %lu\n", stop - start);

    start = k_cycle_get_32();
    ZJS_PRINT("123456789012345678901234567890123456789\n");
    stop = k_cycle_get_32();
    ZJS_PRINT("Time to print 40 chars + newline: %lu\n", stop - start);

    start = k_cycle_get_32();
    ZJS_PRINT("1234567890123456789\n");
    stop = k_cycle_get_32();
    ZJS_PRINT("Time to print 20 chars + newline: %lu\n", stop - start);

    start = k_cycle_get_32();
    ZJS_PRINT("\n");
    stop = k_cycle_get_32();
    ZJS_PRINT("Time to print newline: %lu\n", stop - start);

    start = k_cycle_get_32();
    ZJS_PRINT("");
    stop = k_cycle_get_32();
    ZJS_PRINT("Time to print 0 chars: %lu\n", stop - start);
    return jerry_create_number(counter);
}

jerry_value_t zjs_performance_init()
{
    // create global performance object
    jerry_value_t performance_obj = jerry_create_object();
    zjs_obj_add_function(performance_obj, zjs_performance_now, "now");
    zjs_obj_add_function(performance_obj, zjs_performance_noop, "noop");
    zjs_obj_add_function(performance_obj, zjs_performance_once, "once");
    return performance_obj;
}

#endif // BUILD_MODULE_PERFORMANCE
