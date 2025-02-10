package main_test

import (
	"math/rand"
	"os"
	"runtime"
	"strconv"
	"sync"
	"testing"
)

var (
	numGoroutines int       // Number of parallel tasks, input at runtime
	numElements   int       // Number of integers in the array, calculated from MB input
	numAccesses   = 1 << 20 // Perform 1 million accesses, can adjust if needed
)

func init() {
	// Default values
	goroutines := 10 // Default number of goroutines
	mbData := 256    // Default size in megabytes

	// Override defaults if command line arguments are provided
	if len(os.Args) > 1 {
		goroutines, _ = strconv.Atoi(os.Args[1])
	}
	if len(os.Args) > 2 {
		mbData, _ = strconv.Atoi(os.Args[2])
	}
	if len(os.Args) > 3 {
		gomaxprocs, _ := strconv.Atoi(os.Args[3])
		runtime.GOMAXPROCS(gomaxprocs)
	}

	// Calculate number of elements based on MB of data
	numElements = mbData * (1 << 20) / 4 // Assuming 4 bytes per int

	// Set global variables
	numGoroutines = goroutines
}

func memoryIntensiveTask(data []int) {
	lendata := len(data)
	for i := 0; i < numAccesses; i++ {
		pos := rand.Intn(lendata)
		data[pos] += i
	}
}

func BenchmarkMemoryAccess(b *testing.B) {
	data := make([]int, numElements) // Initialize a large array once

	b.ResetTimer() // Start timing after setup
	for n := 0; n < b.N; n++ {
		memoryIntensiveTask(data)
	}
}

func BenchmarkManualParallel(b *testing.B) {
	data := make([]int, numElements) // Initialize a large array once

	b.ResetTimer()
	for n := 0; n < b.N; n++ {
		var wg sync.WaitGroup
		wg.Add(numGoroutines)
		for i := 0; i < numGoroutines; i++ {
			go func() {
				defer wg.Done()
				memoryIntensiveTask(data)
			}()
		}
		wg.Wait()
	}
}
