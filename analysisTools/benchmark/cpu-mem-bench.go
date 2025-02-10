package main

/****
golang benchmark test intended to have similar cpu/memory load to Dgraph
accesses a wide array of memory locations which can overload CPU caches
surface issues with memory mapping, push golang concurrency, etc.
*/

import (
	"fmt"
	"math/rand"
	"os"
	"runtime"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

var (
	numGoroutines int
	numElements   int
	numAccesses   = 1 << 20 // 1 million accesses
)

func init() {
	// Default values
	goroutines := 10  // Default number of goroutines
	mbData := 256     // Default size in megabytes
	gomaxprocs := 128 // Dgraph setting

	// Override defaults if command line arguments are provided
	if len(os.Args) > 1 {
		goroutines, _ = strconv.Atoi(os.Args[1])
	}
	if len(os.Args) > 2 {
		mbData, _ = strconv.Atoi(os.Args[2])
	}
	if len(os.Args) > 3 {
		gomaxprocs, _ = strconv.Atoi(os.Args[3])
		runtime.GOMAXPROCS(gomaxprocs)
	}

	println("running goroutines:", goroutines, ", mbData:", mbData, ", gomaxprocs:", gomaxprocs)
	// Calculate number of elements based on MB of data
	numElements = mbData * (1 << 20) / 4 // Assuming 4 bytes per int

	// Set global variables
	numGoroutines = goroutines
}

func memoryIntensiveTask(data []int) int64 {
	lendata := len(data)
	var totalAccessedBytes int64 = 0
	for i := 0; i < numAccesses; i++ {
		pos := rand.Intn(lendata)
		data[pos] += i
		totalAccessedBytes += 8 // 4 bytes for read and 4 bytes for write
	}
	return totalAccessedBytes
}

func main() {
	data := make([]int, numElements) // Initialize a large array once

	startTime := time.Now()

	var totalBytes atomic.Uint64

	var wg sync.WaitGroup
	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func() {
			defer wg.Done()
			accessedBytes := memoryIntensiveTask(data)
			totalBytes.Add(accessedBytes)
			println("  completed routine", i, "processing ", accessedBytes/1024/1024, "mb in "+time.Since(startTime).String())
		}()
	}
	wg.Wait()

	fmt.Printf("Execution Time: %s\n", time.Since(startTime))
}
