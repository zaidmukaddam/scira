export default function Loading() {
  return (
    <div className="flex flex-col font-sans items-center min-h-screen bg-background text-foreground transition-all duration-500">
      {/* Navbar skeleton */}
      <div className="fixed top-0 left-0 right-0 z-30 flex justify-between items-center p-3 bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-4">
          {/* New button skeleton */}
          <div className="rounded-full bg-accent hover:bg-accent/80 backdrop-blur-xs animate-pulse">
            <div className="px-3 py-2 flex items-center gap-2">
              <div className="h-4 w-4 bg-muted/50 rounded" />
              <div className="h-3 w-8 bg-muted/50 rounded hidden sm:block" />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Visibility toggle skeleton */}
          <div className="h-8 px-3 py-1.5 bg-muted rounded-md animate-pulse flex items-center gap-1.5">
            <div className="h-4 w-4 bg-muted-foreground/20 rounded" />
            <div className="h-3 w-16 bg-muted-foreground/20 rounded" />
          </div>
          {/* User profile skeleton */}
          <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
        </div>
      </div>

      {/* Main content area */}
      <div className="w-full p-2 sm:p-4 mt-20 sm:mt-16 flex flex-col">
        <div className="w-full max-w-[95%] sm:max-w-2xl space-y-6 p-0 mx-auto transition-all duration-300">
          {/* Messages skeleton */}
          <div className="space-y-0 mb-32 flex flex-col">
            <div className="flex-grow">
              {/* User message skeleton */}
              <div className="mb-2">
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3 animate-pulse">
                      <div className="space-y-1.5">
                        <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
                        <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assistant message skeleton */}
              <div className="mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="w-full">
                  {/* Scira logo header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 bg-muted rounded animate-pulse" />
                    <div className="text-lg font-semibold font-be-vietnam-pro">
                      <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                    </div>
                  </div>

                  {/* Thinking section skeleton */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 mb-4 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div className="flex items-center gap-2 mb-3 animate-pulse">
                      <div className="h-4 w-4 bg-neutral-300 dark:bg-neutral-700 rounded" />
                      <div className="h-4 w-24 bg-neutral-300 dark:bg-neutral-700 rounded" />
                    </div>
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                      <div className="h-3 w-5/6 bg-neutral-200 dark:bg-neutral-800 rounded" />
                      <div className="h-3 w-4/6 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    </div>
                  </div>

                  {/* Tool invocation skeleton */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden mb-4">
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-3 border-b border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-2 animate-pulse">
                        <div className="h-4 w-4 bg-neutral-300 dark:bg-neutral-700 rounded" />
                        <div className="h-4 w-32 bg-neutral-300 dark:bg-neutral-700 rounded" />
                      </div>
                    </div>
                    <div className="p-4 animate-pulse">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
                          <div className="h-20 bg-neutral-100 dark:bg-neutral-900 rounded" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
                          <div className="h-20 bg-neutral-100 dark:bg-neutral-900 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Response text skeleton */}
                  <div className="prose prose-neutral dark:prose-invert max-w-none animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                      <div className="h-4 w-5/6 bg-neutral-200 dark:bg-neutral-800 rounded" />
                      <div className="h-4 w-4/6 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Loading/streaming message skeleton */}
              <div className="min-h-[calc(100vh-18rem)]">
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 bg-muted rounded animate-pulse" />
                    <div className="text-lg font-semibold font-be-vietnam-pro">
                      <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-8 mt-2">
                    <div
                      className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed form skeleton at bottom */}
        <div className="fixed bottom-8 sm:bottom-4 left-0 right-0 w-full max-w-[95%] sm:max-w-2xl mx-auto z-20">
          <div className="flex flex-col w-full">
            {/* Form container */}
            <div className="relative w-full flex flex-col gap-1 rounded-lg transition-all duration-300 font-sans bg-transparent">
              <div className="relative">
                {/* Main form container */}
                <div className="rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 focus-within:border-neutral-300 dark:focus-within:border-neutral-500 transition-colors duration-200">
                  {/* Textarea skeleton */}
                  <div className="px-4 py-4 animate-pulse">
                    <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  </div>

                  {/* Toolbar skeleton */}
                  <div className="flex justify-between items-center p-2 rounded-t-none rounded-b-lg bg-neutral-100 dark:bg-neutral-900 border-t-0 border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2">
                      {/* Group selector skeleton */}
                      <div className="flex items-center gap-1 animate-pulse">
                        <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-800" />
                      </div>

                      {/* Model switcher skeleton */}
                      <div className="h-8 px-3 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse">
                        <div className="w-20 h-full" />
                      </div>

                      {/* Extreme mode toggle skeleton */}
                      <div className="h-8 px-3 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse">
                        <div className="w-16 h-full" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Attachment button skeleton */}
                      <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                      {/* Submit button skeleton */}
                      <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
