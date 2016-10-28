// Copyright (c) 2016, Intel Corporation.
// Author: Geoff Gustafson <geoff@linux.intel.com>

#include <zephyr.h>

#include <misc/ring_buffer.h>
#include <nanokernel.h>

#if defined(CONFIG_STDOUT_CONSOLE)
#include <stdio.h>
#define PRINT           printf
#else
#include <misc/printk.h>
#define PRINT           printk
#endif

SYS_RING_BUF_DECLARE_POW2(ringbuf, 10);

void main(void)
{
    char buf64[8] = { 1, 2, 3, 4, 5, 6, 7, 8};
    int rval;

    // put a "zero-length" message into ring buffer
    PRINT("[1] Writing type 0xdead and value 0xf0 with no args...\n");
    rval = sys_ring_buf_put(&ringbuf, 0xdead, 0xf0, NULL, 0);
    if (rval == 0)
        PRINT("    SUCCESS (%d)\n", rval);

    // put a two-dword message into ring buffer
    PRINT("\n[2] Writing type 0xbeef and value 0x0f with two 32-bit args...\n");
    rval = sys_ring_buf_put(&ringbuf, 0xbeef, 0x0f, (uint32_t *)buf64, 2);
    if (rval == 0)
        PRINT("    SUCCESS (%d)\n", rval);

    uint16_t type = 0;
    uint8_t size = 0;
    uint8_t value = 0;

    // try reading with size 0 and null buf
    PRINT("\n[3] Reading with NULL buf and size 0...\n");
    PRINT("    Before call: type: 0x%x, value: 0x%x\n", type, value);
    rval = sys_ring_buf_get(&ringbuf, &type, &value, NULL, &size);
    if (rval == 0) {
        PRINT("    SUCCESS (%d), SIZE: %d\n", rval, size);
        PRINT("    type: 0x%x, value: 0x%x\n", type, value);
    }
    
    // try reading again with size 0 and a real buf
    PRINT("\n[4] Reading with real buf and insufficient size 0...\n");
    uint32_t buf[3] = {0, 0, 0};
    rval = sys_ring_buf_get(&ringbuf, &type, &value, buf, &size);
    if (rval == -EMSGSIZE) {
        PRINT("    -EMSGSIZE (%d), SIZE: %d\n", rval, size);
        PRINT("    type: 0x%x, value: 0x%x (NOTE: unchanged)\n", type, value);
    }

    // try reading again with size 2 and a real buf
    PRINT("\n[5] Reading with real buf and sufficient size 2...\n");
    PRINT("    Data before call: buf: 0x%x, 0x%x\n", buf[0], buf[1]);
    size = 2;
    rval = sys_ring_buf_get(&ringbuf, &type, &value, buf, &size);
    if (rval == 0) {
        PRINT("    SUCCESS (%d), SIZE: %d\n", rval, size);
        PRINT("    type: 0x%x, value: 0x%x (NOTE: changed)\n", type, value);
        PRINT("    buf: 0x%x, 0x%x\n", buf[0], buf[1]);
    }

    // try reading when empty
    PRINT("\n[6] Reading past end with NULL buf and size 0...\n");
    size = 0;
    rval = sys_ring_buf_get(&ringbuf, &type, &value, NULL, &size);
    if (rval == -EAGAIN) {
        PRINT("    -EAGAIN (%d), SIZE: %d\n", rval, size);
        PRINT("    type: 0x%x, value: 0x%x (NOTE: unchanged)\n", type, value);
    }
}
